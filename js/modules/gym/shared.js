import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { playChime, playBeep } from '../../core/sound.js';
import { showNotification } from '../../core/theme.js';

// --- ACTIVE WORKOUT STATE ---
export const ACTIVE_WORKOUT_KEY = 'kiscord_active_workout';
export let activeWorkout = null;
export let activeTab = 'templates'; // 'templates' | 'feed' | 'prs' | 'exercises'
export let subscription = null;
export let stopwatchInterval = null;
export let restTimerInterval = null;
export let restTimeRemaining = 0;
export let restTimeDuration = 90; // Default 90 seconds
export let isRestTimerRunning = false;

// Setters (needed because ES module exports are read-only bindings for importers)
export function setActiveWorkout(val) { activeWorkout = val; }
export function setActiveTab(val) { activeTab = val; }
export function setSubscription(val) { subscription = val; }
export function setStopwatchInterval(val) { stopwatchInterval = val; }
export function setRestTimerInterval(val) { restTimerInterval = val; }
export function setRestTimeRemaining(val) { restTimeRemaining = val; }
export function setRestTimeDuration(val) { restTimeDuration = val; }
export function setIsRestTimerRunning(val) { isRestTimerRunning = val; }

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

// --- DEFAULT DATABASE SEED DATA ---
export const defaultExercises = [
    {
        id: "bench_press",
        name: "Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps", "Přední ramena"],
        instructions: "Lehněte si na lavici, lopatky stáhněte k sobě a dolů. Osu spusťte pod kontrolou ke spodní části hrudníku a s výdechem vytlačte nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025-EIeI8Vf.gif",
        is_default: true
    },
    {
        id: "dumbbell_flys",
        name: "Rozpažování s Jednoručkami",
        category: "Hrudník",
        secondary_muscles: ["Přední ramena"],
        instructions: "S mírně pokrčenými lokty spouštějte jednoručky do stran, dokud neucítíte protažení prsních svalů, poté plynule stáhněte zpět k sobě.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0308-3w39sPq.gif",
        is_default: true
    },
    {
        id: "shoulder_press",
        name: "Tlaky na ramena s JČ",
        category: "Ramena",
        secondary_muscles: ["Triceps", "Horní hrudník"],
        instructions: "Sedněte si s oporou zad. Činky držte ve výšce uší a s výdechem je vytlačte nad hlavu bez propínání loktů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0405-b0Q3lT9.gif",
        is_default: true
    },
    {
        id: "lateral_raises",
        name: "Upažování (Lateral Raise)",
        category: "Ramena",
        secondary_muscles: ["Trapézy"],
        instructions: "Mírný předklon v bocích, lokty lehce pokrčené. Zvedejte paže do stran do výšky ramen, malíčky mírně nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-DsgkuIt.gif",
        is_default: true
    },
    {
        id: "squat",
        name: "Dřep s Velkou Činkou",
        category: "Nohy",
        secondary_muscles: ["Hýždě", "Hamstringy", "Spodní záda"],
        instructions: "Nohy na šířku ramen, špičky mírně ven. Držte rovná záda a klesejte hýžděmi dolů alespoň do úrovně kolen (paralela).",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0043-qXTaZnJ.gif",
        is_default: true
    },
    {
        id: "leg_press",
        name: "Leg Press",
        category: "Nohy",
        secondary_muscles: ["Hýždě", "Kvadricepsy"],
        instructions: "Chodidla umístěte na střed desky. Spouštějte závaží do úhlu 90 stupňů v kolenou a plynule vytlačte přes paty bez zvedání pánve.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0740-4K42N6m.gif",
        is_default: true
    },
    {
        id: "leg_extensions",
        name: "Předkopávání v sedě",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy"],
        instructions: "Zadní část kolen opřená o hranu sedáku. S výdechem propněte nohy v kolenou a v horní fázi na 1 sekundu zatněte kvadricepsy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-6p98r5D.gif",
        is_default: true
    },
    {
        id: "deadlift",
        name: "Mrtvý Tah",
        category: "Záda",
        secondary_muscles: ["Hýždě", "Hamstringy", "Trapézy", "Střed těla"],
        instructions: "Osa nad středem chodidel. Chytněte osu, zatáhněte ramena dozadu, zpevněte břicho a zvedejte činku s rovnými zády pomocí tahu nohou a boků.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0032-ila4NZS.gif",
        is_default: true
    },
    {
        id: "pull_ups",
        name: "Shyby na Hrazdě",
        category: "Záda",
        secondary_muscles: ["Biceps", "Předloktí"],
        instructions: "Úchop na šířku ramen nebo širší nadhmatem. Z plného visutého protažení táhněte hrudník k hrazdě, lokty směřují k pasu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-lBDjFxJ.gif",
        is_default: true
    },
    {
        id: "lat_pulldown",
        name: "Stahování Horní Kladky",
        category: "Záda",
        secondary_muscles: ["Biceps", "Zadní ramena"],
        instructions: "Mírný záklon, hrudník vypnutý. Tyč stahujte k horní části hrudníku a v dolní pozici zatněte zádové svaly (křídla).",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0198-1Y9t9vH.gif",
        is_default: true
    },
    {
        id: "barbell_rows",
        name: "Přítahy VČ v předklonu",
        category: "Záda",
        secondary_muscles: ["Biceps", "Trapézy", "Zadní ramena"],
        instructions: "Předklon v trupu cca 45 stupňů s rovnými zády. Přitahujte osu k pupku, lokty držte blízko těla.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0027-5g3t9Pz.gif",
        is_default: true
    },
    {
        id: "bicep_curls",
        name: "Bicepsový zdvih s JČ",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Lokty zafixované u těla. S výdechem zvedejte činky k ramenům se supinací (vytáčením dlaní nahoru) a v horní fázi zatněte biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0294-NbVPDMW.gif",
        is_default: true
    },
    {
        id: "tricep_pushdowns",
        name: "Stahování kladky na triceps",
        category: "Ruce",
        secondary_muscles: ["Triceps"],
        instructions: "Stůjte vzpřímeně, lokty u těla. Tlačte lano/tyč dolů do úplného propnutí paží a na vteřinu zatněte triceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0241-1vP8p8Y.gif",
        is_default: true
    },
    {
        id: "plank",
        name: "Plank (Výdrž)",
        category: "Břicho",
        secondary_muscles: ["Ramena", "Hýždě", "Střed těla"],
        instructions: "Opřete se o předloktí a špičky nohou. Tělo tvoří přímku od hlavy k patám, zpevněte břicho i hýždě a nezvedejte zadek.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0644-3g10p7Y.gif",
        is_default: true
    },
    {
        id: "leg_raises",
        name: "Přednožování ve visu",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Zavěste se na hrazdu. Bez švihu a kontrolovaně zvedejte nohy nebo pokrčená kolena k hrudníku se stahováním spodního břicha.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0472-8m9p7Y1.gif",
        is_default: true
    }
];

// --- POPULAR EXERCISE PRESET TEMPLATES (1-click quick add) ---
export const POPULAR_EXERCISE_PRESETS = [
    {
        name: "Tlaky na šikmé lavici s JČ",
        category: "Hrudník",
        secondary_muscles: ["Přední ramena", "Triceps"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-rXN2Y8D.gif",
        instructions: "Lavici nastavte na úhel 30–45 stupňů. Činky vytlačujte nahoru nad horní část prsou s plynulým nádechem při spouštění."
    },
    {
        name: "Tlaky na šikmé lavici s VČ",
        category: "Hrudník",
        secondary_muscles: ["Přední ramena", "Triceps"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0047-jK5nU5o.gif",
        instructions: "Spouštějte osu ke klíčním kostem / horní části hrudníku a vytlačte nahoru bez propnutí loktů."
    },
    {
        name: "Kliky na bradlech (Dips)",
        category: "Hrudník",
        secondary_muscles: ["Triceps", "Přední ramena"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0251-lP98vKm.gif",
        instructions: "Pro zacílení prsou se mírně předkloňte a lokty držte mírně od těla. Klesejte do úhlu 90 stupňů v loktech."
    },
    {
        name: "Face Pulls na kladce",
        category: "Ramena",
        secondary_muscles: ["Zadní ramena", "Trapézy", "Rotátorová manžeta"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0168-3e4b7vA.gif",
        instructions: "Lano táhněte k očím/čelu s roztažením loktů a vnější rotací ramen pro posílení zadních ramen a zdraví ramen."
    },
    {
        name: "Upažování na spodní kladce",
        category: "Ramena",
        secondary_muscles: ["Trapézy"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0190-bO8nK4m.gif",
        instructions: "Táhněte lanko křížem do strany do výšky ramen. Kladka udržuje konstantní napětí po celé dráze pohybu."
    },
    {
        name: "Zakopávání v leže (Leg Curl)",
        category: "Nohy",
        secondary_muscles: ["Lýtka"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0599-49Vw7iE.gif",
        instructions: "Pevně držte madla a tlačte pánev do podložky. Plynule přitahujte válec k hýždím a zatněte hamstringy."
    },
    {
        name: "Výpony na lýtka ve stoje",
        category: "Nohy",
        secondary_muscles: ["Lýtka"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0147-3gYp8mK.gif",
        instructions: "Z plného protažení paty zvedejte tělo na špičky a nahoře na vteřinu podržte maximální kontrakci."
    },
    {
        name: "Přítahy spodní kladky v sedě",
        category: "Záda",
        secondary_muscles: ["Biceps", "Zadní ramena"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0239-0p19G9w.gif",
        instructions: "Rovná záda, hrudník dopředu. Táhněte adaptér k pupku a stáhněte lopatky k sobě."
    },
    {
        name: "Kladivové zdvihy (Hammer Curl)",
        category: "Ruce",
        secondary_muscles: ["Hluboký sval pažní", "Předloktí"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0313-vB92p1Y.gif",
        instructions: "Dlaně směřují k sobě po celou dobu pohybu. Skvělý cvik na šířku paže a sílu úchopu."
    },
    {
        name: "Bicepsový zdvih s EZ osou",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0447-b89vK2a.gif",
        instructions: "EZ osa šetří zápěstí. Lokty držte pevně u těla a zvedejte osu plynulým tahem bicepsů."
    },
    {
        name: "Francouzský tlak s EZ činkou",
        category: "Ruce",
        secondary_muscles: ["Triceps"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0443-4m87P8w.gif",
        instructions: "Lehněte si na lavici, lokty směřují ke stropu. Spouštějte činku k čelu a silou tricepsů vytlačte zpět."
    },
    {
        name: "Zkracovačky na podložce (Crunches)",
        category: "Břicho",
        secondary_muscles: ["Přímý sval břišní"],
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0274-1mP7vK2.gif",
        instructions: "Nezvedejte celá záda ze země, pouze stahujte žebra k pánvi se silným výdechem a zatnutím břicha."
    }
];

export const defaultTemplates = [
    {
        name: "Push Day 🦍",
        description: "Trénink zaměřený na prsa, ramena a triceps",
        exercises: [
            { exercise_id: "bench_press", sets: 4, reps: 8, weight: 60 },
            { exercise_id: "shoulder_press", sets: 3, reps: 10, weight: 16 },
            { exercise_id: "dumbbell_flys", sets: 3, reps: 12, weight: 12 },
            { exercise_id: "lateral_raises", sets: 4, reps: 15, weight: 8 },
            { exercise_id: "tricep_pushdowns", sets: 3, reps: 12, weight: 20 }
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
            { exercise_id: "bicep_curls", sets: 3, reps: 12, weight: 12 }
        ]
    },
    {
        name: "Legs & Core Day 🦵",
        description: "Trénink zaměřený na nohy a břicho",
        exercises: [
            { exercise_id: "squat", sets: 4, reps: 8, weight: 70 },
            { exercise_id: "leg_press", sets: 3, reps: 10, weight: 120 },
            { exercise_id: "leg_extensions", sets: 3, reps: 12, weight: 45 },
            { exercise_id: "leg_raises", sets: 3, reps: 15, weight: 0 },
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
            startTime: activeWorkout.startTime.toISOString(),
            durationSeconds: activeWorkout.durationSeconds,
            exercises: activeWorkout.exercises,
            isMinimized: activeWorkout.isMinimized || false,
            lastSavedTime: new Date().toISOString(),
            restTimeRemaining,
            restTimeDuration,
            isRestTimerRunning
        };
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(dataToSave));
    } else {
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
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
                if (isRestTimerRunning && parsed.restTimeRemaining > 0) {
                    restTimeRemaining = Math.max(0, parsed.restTimeRemaining - elapsedSeconds);
                    if (restTimeRemaining === 0) {
                        isRestTimerRunning = false;
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
    
    // Remove the global floating badge!
    document.getElementById('global-active-workout-badge')?.remove();
}

// --- GLOBAL WORKOUT BADGE ---

export function updateGlobalWorkoutBadge() {
    if (!activeWorkout) {
        document.getElementById('global-active-workout-badge')?.remove();
        return;
    }
    
    // Do not show the global floating badge if we are already in the Posilovna channel
    if (state.currentChannel === 'gym-tracker') {
        document.getElementById('global-active-workout-badge')?.remove();
        return;
    }
    
    let badge = document.getElementById('global-active-workout-badge');
    if (!badge) {
        const html = `
            <div id="global-active-workout-badge" onclick="window.Gym.restoreWorkoutGlobal()" 
                 class="fixed bottom-4 right-4 z-[100] cursor-pointer bg-[#2f3136]/95 backdrop-blur-md border border-[#faa61a]/30 shadow-[0_4px_20px_rgba(250,166,26,0.25)] rounded-2xl px-4 py-2.5 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all select-none animate-pulse-slow">
                <div class="w-8 h-8 rounded-xl bg-[#faa61a]/10 flex items-center justify-center text-[#faa61a]">
                    <i class="fas fa-dumbbell text-sm animate-bounce-slow"></i>
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-white/40 tracking-widest block leading-none mb-1 font-sans">Běží trénink</span>
                    <span id="global-workout-timer" class="text-xs font-mono font-black text-white leading-none">00:00</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        badge = document.getElementById('global-active-workout-badge');
    }
    
    const globalTimerEl = document.getElementById('global-workout-timer');
    if (globalTimerEl && activeWorkout) {
        const h = Math.floor(activeWorkout.durationSeconds / 3600);
        const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
        const s = activeWorkout.durationSeconds % 60;
        globalTimerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
 * to state and Supabase for all default exercises that are missing image_url.
 */
export async function syncDefaultExercisesMedia(renderGymFn) {
    if (isSyncingMedia || !state.gymExercises || state.gymExercises.length === 0) return;

    const missingMedia = defaultExercises.filter(defEx => {
        const current = state.gymExercises.find(ge => ge.id === defEx.id);
        return current && !current.image_url;
    });

    if (missingMedia.length === 0) return;

    isSyncingMedia = true;
    let didUpdateLocal = false;

    for (const defEx of missingMedia) {
        const current = state.gymExercises.find(ge => ge.id === defEx.id);
        if (current) {
            current.image_url = defEx.image_url;
            if (!current.instructions) current.instructions = defEx.instructions;
            if (!current.secondary_muscles || current.secondary_muscles.length === 0) {
                current.secondary_muscles = defEx.secondary_muscles;
            }
            didUpdateLocal = true;
        }
    }

    if (didUpdateLocal && renderGymFn && state.currentChannel === 'gym-tracker' && !activeWorkout) {
        renderGymFn();
    }

    try {
        for (const defEx of missingMedia) {
            await supabase.from('gym_exercises').update({
                image_url: defEx.image_url,
                instructions: defEx.instructions,
                secondary_muscles: defEx.secondary_muscles
            }).eq('id', defEx.id);
        }
    } catch (e) {
        console.warn("[Gym] Default exercises media sync error:", e);
    } finally {
        isSyncingMedia = false;
    }
}
