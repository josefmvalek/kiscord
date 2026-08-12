import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { playChime } from '../../core/sound.js';
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

// --- DEFAULT DATABASE SEED DATA ---
export const defaultExercises = [
    { id: "bench_press", name: "Bench Press", category: "Hrudník", is_default: true },
    { id: "dumbbell_flys", name: "Rozpažování s Jednoručkami", category: "Hrudník", is_default: true },
    { id: "shoulder_press", name: "Tlaky na ramena s JČ", category: "Ramena", is_default: true },
    { id: "lateral_raises", name: "Upažování (Lateral Raise)", category: "Ramena", is_default: true },
    { id: "squat", name: "Dřep s Velkou Činkou", category: "Nohy", is_default: true },
    { id: "leg_press", name: "Leg Press", category: "Nohy", is_default: true },
    { id: "leg_extensions", name: "Předkopávání v sedě", category: "Nohy", is_default: true },
    { id: "deadlift", name: "Mrtvý Tah", category: "Záda", is_default: true },
    { id: "pull_ups", name: "Shyby na Hrazdě", category: "Záda", is_default: true },
    { id: "lat_pulldown", name: "Stahování Horní Kladky", category: "Záda", is_default: true },
    { id: "barbell_rows", name: "Přítahy VČ v předklonu", category: "Záda", is_default: true },
    { id: "bicep_curls", name: "Bicepsový zdvih s JČ", category: "Ruce", is_default: true },
    { id: "tricep_pushdowns", name: "Stahování kladky na triceps", category: "Ruce", is_default: true },
    { id: "plank", name: "Plank (Výdrž)", category: "Břicho", is_default: true },
    { id: "leg_raises", name: "Přednožování ve visu", category: "Břicho", is_default: true }
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
    } else {
        // Timer finished!
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        isRestTimerRunning = false;
        
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
                class="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all duration-150 flex items-center justify-center select-none ${bgClass}" 
                title="${title}">
            ${label}
        </button>
    `;
}

// --- REALTIME SUBSCRIPTION ---

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
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGymFn();
                    }
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
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGymFn();
                    }
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
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGymFn();
                    }
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
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGymFn();
                    }
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
